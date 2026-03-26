"""
This file will contain the model component of the MVC architecture 

Just as a reference in MVC: 
    - The model handles data logic and interacts with the data store
    - The view handles the data display (frontend)
    - The controller will handle any user actions (This is in views.py)

In this file you can also find the product classes for a simple factory design pattern 
    - The user is the base product 
    - OperatorUser is a concrete product 
    - AdminUser is a concrete product 
The UserFactory that is in the factory.py file will use an if/elif structure to decide which concrete product 
to create, kinda like the pizza factory example from our lectures.

The audit log model in this file will act as the observer pattern. The views will not write to the audit log table directly
I will try to have the observers in observer.py handle that when we send it update notifications from the spray record.

I think it is also important to highlight some quality requirements that are addressed in this file: 
    - Correctness 
        Fields will match the exact data types from the schema
    
    -Robustness
        UserRole and RecordStatus choices prevent invalid data from being saved into the database
"""

import uuid 
from django.db import models

#User choices 
#These match the ENUM types in the schema
# So each entry will have a database value and a human label 
class UserRole(models.TextChoices):
    #Two choices are either operator or admin 
    OPERATOR = 'OPERATOR', "Operator"
    ADMIN = 'ADMIN', 'Admin'

class RecordStatus(models.TextChoices):
    #Our workflow can have 4 stages draft, submitted, approved or flagged 
    DRAFT = 'DRAFT', "Draft"
    SUBMITTED = 'SUBMITTED', "Submitted"
    APPROVED = 'APPROVED', 'Approved'
    FLAGGED = 'FLAGGED', 'Flagged'

############################################################################################################################################

# USER MODEL 
#IN the simple factory pattern this is our base product class
#And the operator and admin below are the concrete products 
class User(models.Model):
    """
    So this is our base user model which will store the other accounts 
    It will map the the users table in the schema 

    Operator and Admin will inherit from this class 

    I think i figured out how to properly store passwords as hashes so the password is never saved to the database 
    """

    #UUID primary key will match the char(36) in the schema 
    #After researching I think uuid.uuid4 will generate a unique ID
    id = models.UUIDField(
            primary_key=True,
            default=uuid.uuid4,
            editable=False,
    )

    #The email address must be unique! 
    email = models.EmailField(
            max_length=255, 
            unique=True,
    )

    #Password - hopefully hashed?
    password_hash = models.CharField(
            max_length=255
    )

    #Role - determines what the user can do 
    #The Operator can create and submit spray records 
    #The Admin can search, approve and flag records 
    role = models.CharField(
            max_length=10,
            choices=UserRole.choices,
    )

    #Add a time when the user is created 
    created_at = models.DateTimeField(
            auto_now_add=True,
    )

    """
    Django lets us include a meta class where we can put settings about a table itself rather than settings about individual columns 
    Reference this to think of it as settings on the table as a whole 
    YOU NEED TO USE KEYWORD META
    """ 
    class Meta:
        #Use the exact table name... 
        db_table = "users"
    
    def __str__(self): 
        #implemented to be able to view an object in text 
        #Or how this user will appear in print statements and to the admin 
        return f"{self.email} ({self.role})"
    
    def get_permissions(self):
        """ 
        Return the list of permission this user has 
        Will be overwritten by each concrete product below 
        """ 
        return[]

#######################################################################################################################################

#Operator User 
#From what i understand a proxy model in python will share the same databse table as its parent 
#but is able to have different behaviour? 
#So this should allow us to have operator specific instructions. 
class OperatorUser(User): 
    """ 
    This is the first concrete product 
    It represents a spray operator who goes out into the field and applies a pesticide/herbicide
    and then submits a digital record.

    Permissions 
        - Create a new spray record 
        - Edit a draft record 
        - submit records for an admin to review 
        - View their own records 
    """ 
    class Meta: 
        #So here when proxy is true it will use the same users table instead of creating a new table 
        proxy = True
    
    def get_permissions(self): 
        #Returns the list of things an operator can do. 
        return [
            "create_record",
            "edit_draft",
            "submit_record",
            "view_records",
        ]
    
    def save(self, *args, **kwargs):
        #Make sure to set the role to operator when it is saving add extra instruction before saving.
        #args and kwargs are used to accept unamed and named arguements that are passed in. 
        #I also believe super accesses the parent class
        self.role = UserRole.OPERATOR
        super().save(*args, **kwargs)

#######################################################################################################################################

#Admin User
class AdminUser(User):
    """ 
    This is the second concrete product in the simple factory. 

    This class represents a supervisor or admin who reviews a spray record, can search historical data 
    and can view the map. 

    Permissions: 
        - View all spray records from all operators 
        - Search and filter historical data (up to 5 years)
        - Approve records 
        -Flag records that have issues 
        - View the map 
    """ 
    class Meta: 
        proxy = True 

    def get_permissions(self): 
        #Return what the admin is allowed to do 
        return[
            "view_all_records",
            "search_records",
            "approve_record",
            "flag_record",
            "view_map",
        ]

    def save(self, *args, **kwargs):
        #Make sure to set role to admin 
        self.role = UserRole.ADMIN
        super().save(*args, **kwargs)

#######################################################################################################################################

#Spray Record 
class SprayRecord(models.Model):
    """ 
    This will store the pesticide or herbicide application records that are created by operators. 
    This will always map to the spray_records table 

    Each record will hold what was sprayed, how much, where and when and follow the workflow mentioned throughout this project 
    Draft -> Submitted -> Approved OR Flagged 

    Location Data: 
        Operators cna draw a polygon on google maps to mark the exact sare that they sprayed. I will
        store this polygon as  aJSON array of lattitude and longitude coordinates. We can find the center 
        point automatically for a quick display on the map. 
    """ 
    #Primary Key is the UUID 
    id = models.UUIDField(
            primary_key=True, 
            default=uuid.uuid4,
            editable=False,
    )

    #Which operator created this record.. 
    operator_email = models.EmailField(
            max_length=255,
            db_index=True, #I think i can use this to speed up searches 
    )

    #When did the spraying take place...
    date_applied = models.DateField()

    #Name of the product 
    product_name = models.CharField(max_length=255)

    #PCP Act Number 
    pcp_act_number = models.CharField(max_length=64)

    #Volume of concentrated chemicals, in litres 
    chemical_volume_l = models.DecimalField(
            max_digits=10, 
            decimal_places=2,
    )

    #Volume of water to dilute, in litres 
    water_volume_l = models.DecimalField(
            max_digits=10, 
            decimal_places=2,
    )

    #I think its a good idea to have a option to add any additional notes if needed! 
    notes = models.TextField(
        null=True, 
        blank=True,
    )

    #Location Data - need to use with a Google Maps API 
    #Need to store as a human readable location description 
    #Something like an address or vague location 
    #EXAMPLE - "1111 Victoria Ave" OR "Ring Road, North Side, close to Winapeg Street Offramp"
    location_text = models.CharField(
        max_length = 255, 
        null = True, 
        blank = True,
    )

    #The polygon coordinates are drawn on google maps by the operator.
    #Stored as a JSON array of objects 
    #The polygon is representitive of the exact area that was sprayed 
    #Arpit and the frontend team need to make this a shaded area on the map 
    geometry_polygon = models.JSONField(
        null = True, 
        blank = True,
    )

    #We also need the center of the polygon or something to act as a marker on the map
    #So if we find the middle long and lat this should work 
    geometry_center_lat = models.DecimalField(
        max_digits = 10, 
        decimal_places = 6, 
        null = True, 
        blank = True,
    )

    geometry_center_lng = models.DecimalField(
        max_digits = 10, 
        decimal_places = 6, 
        null = True, 
        blank = True,
    )

    #We need to store the status as well, and make sure it defaults to a draft when it is created 
    status = models.CharField(
        max_length = 10, 
        choices = RecordStatus.choices, 
        default = RecordStatus.DRAFT, 
        db_index = True, #I've seen in examples that this can speed up filtering by different categories, in this case by status
    )

    #Add a timestamp for when... Online it says Django manages these 
    created_at = models.DateTimeField(auto_now_add = True) # For creation
    updated_at = models.DateTimeField(auto_now = True) #Update the time on a save

    #Instructions for table in meta class 
    class Meta: 
        db_table = "spray_records"
        indexes = [
            #we can add indexes to help the speed of admin queries 
            models.Index(fields = ["date_applied"], name = "idx_date"),
            models.Index(fields = ["product_name"], name = "idx_product"), 
            models.Index(fields = ["pcp_act_number"], name = "idx_pcp"),
        ]
    
    #Help for displaying objects as text 
    def __str__(self): 
        return f"{self.product_name} on {self.date_applied} [{self.status}]"

#######################################################################################################################################

#Audit Log 
class AuditLog(models.Model): 
    """ 
    This will record important actions like status changes 
    This will map to the audit logs table 

    This table will be populated by the observer pattern. 
    When a spray record has a status change, the observer in the observer.py file will be able to create a new row here. 
    The viewers will never write to this table directly since we want to use an observer pattern in our project 
    """ 

    #Primary key is the uuid 
    id = models.UUIDField(
            primary_key = True, 
            default = uuid.uuid4, 
            editable = False, 
    )

    #We need to know what spray record this log is about... 
    record_id = models.UUIDField(db_index = True)

    #We need to know who performed this 
    actor_email = models.EmailField(max_length = 255)

    #What was the status, what happened? 
    action = models.CharField(max_length=64)

    #Since this is part of an observer pattern we need before and after status changes 
    from_status = models.CharField(
        max_length = 10, 
        choices = RecordStatus.choices, 
        null = True, 
        blank = True,
    )

    to_status = models.CharField(
        max_length = 10, 
        choices = RecordStatus.choices, 
        null = True, 
        blank = True,
    )

    #When was this log entry created 
    timestamp = models.DateTimeField(auto_now_add = True)

    #Specific table instructions 
    class Meta: 
        db_table = "audit_logs"
    
    #Turn objects into readable text 
    def __str__(self): 
        return f"[{self.timestamp}] {self.actor_email}: {self.action}"