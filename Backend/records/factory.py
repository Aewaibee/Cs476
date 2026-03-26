""" 
This file will implement the factory design pattern.

IN our app we need to create two types of users which are: 
    -Operators 
    -Admin

And we need this to happen without the views knowing the details of how everything is 
put together.

Im basing most of this off of the pizza structure we talked about during lectures 

This will also contain the spray record factory for creating spray records with polygon validation and calculation of the center point of the polygon.
After creating objects they will fire events to notify the observers which hopefully connects these design patterns together in a nice way.
"""

import logging 
import bcrypt

from records.models import (
    User, OperatorUser, AdminUser,
    SprayRecord, UserRole, RecordStatus,
)

logger = logging.getLogger("records")

#User Factory 
#Hopefully the view will be able to call this factory and gets back the correct type of user 
#without needing to know the details of how the user is created or what type it is.
class UserFactory: 
    """
    Factory for creating user objects 
    This factory will deal with all creation logic in one place 
        - Password hashing through bcrypt
        - Role validation 
        - Selecting the right concrete user class 
        - Fire observer events after creation
    """ 
    @staticmethod #this just means that we can call this method without needing to create an instance of the factory
    def create_user(role: str, email: str, password: str) -> User: 
        """
        Create and return the right type of user based on the role provided 

        Uses elif structure 
        """
        #First thing is to validate the role 
        if role not in UserRole.values: 
            raise ValueError(
                f"Invalid role: {role}. Must be one of: "
                f"{list(UserRole.values)}"
            )
        
        #Second is to hash the password using bcrypt
        #Trying what was on geeksforgeeks... 
        password_hash = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt(),
        ).decode('utf-8') #bcrypt returns bytes so we need to change it back to a string 

        #Third is to create the right concrete user class based on the role 
        if role == UserRole.OPERATOR:
            user = OperatorUser.objects.create(
                email=email,
                password_hash=password_hash,
                role=UserRole.OPERATOR,
            )
            logger.info("Factory created an OperatorUser with email: %s", email)
        
        elif role == UserRole.ADMIN:
            user = AdminUser.objects.create(
                email = email,
                password_hash=password_hash,
                role = UserRole.ADMIN,
            )
            logger.info("Factory created an AdminUser with email: %s", email)
        
        #Next is to fire the observer events 
        #WE import here to avoid cicular imports
        from records.observer import spray_record_subject
        spray_record_subject.set_state({
            "event": "user_created",
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role,
        })

        return user

###################################################################################################################################################################

#Spray Record Factory
#Will create spray record objects and deal with the polygon stuff. 
#Technically not really a factory since there is only one type of spray record, but all logic related to creating spray records will be in this class.
class SprayRecordFactory:
    """
    This will handle all the logic for spray records:
        - Required field validation 
        - Polygon validation 
        - Center point calculation
        - Set default status to draft 
        - Fire observer events on creation 
    """ 

    @staticmethod
    def calculate_polygon_center(polygon: list) -> tuple: 
        """
        Finds the center point of a polygon 

        Will use the average value of lat and lng to find a center point. 

        Can store this in the database so the frontend can show a map marker quickly. 
        """
        #If no polygon is provided we can just return None for the center point
        if not polygon:
            return None, None 
        
        #Now to make sums 
        total_lat = sum(point['lat'] for point in polygon)
        total_lng = sum(point['lng'] for point in polygon)
        count = len(polygon)

        #Then return average 
        return round(total_lat / count, 6), round(total_lng / count, 6) #rounding to 6 decimal places seems to be the norm when looking online 
    
    @staticmethod
    def validate_polygon(polygon: list):
        """
        This is a robustness quality

        To be valid a polygon must have at least 3 points and each point must have lat and lng 

        If wrong then we will raise a ValueError 
        """ 
        #I need to make sure the polygon is a list of coordinates 
        if not isinstance(polygon, list):
            raise ValueError(
                "Invalid polygon: must be a list of coordinates"
            )
        
        #Need to make sure there are at least 3 points 
        if len(polygon) < 3:
            raise ValueError(
                "Invalid polygon: must have at least 3 points"
            )
        
        #Now check each point has lat and lng 
        for i, point in enumerate(polygon):
            #Every point needs to be a dict with lat and lng 
            if not isinstance(point, dict):
                raise ValueError(
                    f"Invalid polygon: point {i} is not a dict"
                )
            
            #Each point needs to have lat and lng keys
            missing_keys = [key for key in ['lat', 'lng'] if key not in point]
            if missing_keys:
                raise ValueError(
                    f"Invalid polygon: point {i} is missing {'lat and lng' if len(missing_keys) == 2 else missing_keys[0]}."
                )
            
            #Need to make sure lat and lng are also numbers 
            try:
                lat = float(point['lat'])
                lng = float(point['lng'])
            except (TypeError, ValueError):
                raise ValueError(
                    f"Invalid polygon: point {i} lat or lng that is not a number"
                )
    
    @classmethod
    def create_record (cls, data: dict) -> SprayRecord: 
        """ 
        Will create and save a new spray record based on the provided data and return the created record

        If this raises a key error then a required field is missing 
        If this raises a value error then something is wrong most likely with the polygon
        """
        #First we need to validate the required fields and reject incomplete data
        required_fields = [
            "operator_email",
            "date_applied",
            "product_name",
            "pcp_act_number",
            "chemical_volume_l",
            "water_volume_l",
        ]
        for field in required_fields:
            if field not in data:
                raise KeyError(f"Missing required field: {field}")
        
        #Second is to deal with the polygon if it was provided
        polygon = data.get("geometry_polygon")
        center_lat = None
        center_lng = None

        if polygon:
            cls.validate_polygon(polygon)
            center_lat, center_lng = cls.calculate_polygon_center(polygon)
        
        #Third is to create the record, every new record starts with a draft status 
        record = SprayRecord.objects.create(
            operator_email=data["operator_email"],
            date_applied=data["date_applied"],
            product_name=data["product_name"],
            pcp_act_number=data["pcp_act_number"],
            chemical_volume_l=data["chemical_volume_l"],
            water_volume_l=data["water_volume_l"],
            notes =data.get("notes"),
            location_text=data.get("location_text"),
            geometry_polygon=polygon,
            geometry_center_lat=center_lat,
            geometry_center_lng=center_lng,
            status=RecordStatus.DRAFT,
        )

        logger.info(
            "Factory created a SprayRecord with id: %s for operator: %s", 
            record.id, record.operator_email
            )
        
        #Finally we fire the observer events
        #Once again we import here to avoid circular imports
        from records.observer import spray_record_subject
        spray_record_subject.set_state({
            "event": "record_created",
            "record_id": str(record.id),
            "actor_email": data["operator_email"],
        })

        return record
