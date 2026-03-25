"""
SO even though this file is called views, it is actually the controller portion of MVC.
From what i have learned about Django, it is like a model, view, template frame where the view is actually the controller and the template is the view. 

Each view class can take a HTTP request from the frontend, process it and then return a JSON response 

I guess it would be helpful to show some of the API endpoints that we have created in this file.

    POST /api/users/                 - Create a new user
    POST /api/records/              - Create a new record
    GET /api/records/               - List records (with filtering)
    GET /api/records/<id>/          - Retrieve a specific record (a single one)
    PUT /api/records/<id>/          - Update a specific record (a draft one) 
    POST /api/records/<id>/submit/ - Submit a specific record (a draft one) for review
    POST /api/records/<id>/approve/ - Approve a specific record (a submitted one) 
    POST /api/records/<id>/flag/    - Flag a specific record (a submitted one) for review
    GET /api/records/<id>/audit-log/ - get the log of everything that happened to a single record 
"""

#imports and whatnot 
import json
import logging 
import bcrypt
import jwt

from datetime import datetime, timedelta, timezone  # For token generation
from django.conf import settings

from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt #This lets the frontend send JSON requests without a security token
from django.utils.decorators import method_decorator #This lets us use that rule on our classes

from records.models import User, SprayRecord, AuditLog, RecordStatus
from records.factory import UserFactory, SprayRecordFactory
from records.observer import spray_record_subject

logger = logging.getLogger("records")

#Got those from here: https://docs.djangoproject.com/en/6.0/howto/csrf/ and here https://docs.djangoproject.com/en/6.0/topics/class-based-views/

#Need a function to help parse the JSON body of the request, since we will be doing that a lot
def parse_json_request(request):
    """
    Helper function to parse JSON body from a request.

    This will turn the JSON body of the request into a Python dictionary that we can work with.

    Will return: 
        (data, none) if good 
        (None, error) if bad 
    """
    try: 
        #This is where we actually parse the JSON body of the request
        #json.loads() is a built in function that takes a JSON string and turns it into a Python dictionary
        data = json.loads(request.body)
        return data, None
    except json.JSONDecodeError:
        #If JSON is invalid send a bad request response
        return None, JsonResponse(
            {"error": "Invalid JSON"}, 
            status=400
        )

########################################################################################################################################################################################

# Auth views
@method_decorator(csrf_exempt, name='dispatch') #this is what lets us use this class to handle requests without needing a CSFR token, This makes it easier for the frontend
class AuthSeedView(View):
    """
    This seeds the database with an initial demo user

    Calls the UserFactory for each of the demo users

    This is the POST /api/auth/seed
    """
    def post(self, request):
        # Demo users from login.html
        demo_users = [
            {"role": "OPERATOR", "email": "operator@test.com", "password": "pass123"},
            {"role": "ADMIN", "email": "admin@test.com", "password": "pass123"}
        ]

        for demo_user in demo_users:
            # Create the demo user only if it does not already exist
            if not User.objects.filter(email=demo_user["email"]).exists():
                try:
                    user = UserFactory.create_user(
                        role=demo_user["role"],
                        email=demo_user["email"],
                        password=demo_user["password"],
                    )

                    logger.info(f"Demo user created: {user.email} with role {user.role}")

                # Just using a blanket except since most errors shouldn't be a concern with demo_user values being hard coded
                except Exception as e:
                    logger.error("Error creating user: %s", str(e))
                    return JsonResponse(
                        {"error": "An error occurred while seeding the demo users"},
                        status=500,
                    )
         # Success if demo users already existed or if the demo users were newly created
        return JsonResponse(
            {"message": "Demo users have been checked/created successfully."},
            status=200, # General success status code
        )
    
@method_decorator(csrf_exempt, name='dispatch') #this is what lets us use this class to handle requests without needing a CSFR token, This makes it easier for the frontend
class AuthLoginView(View):
    def post(self, request):
        data, error = parse_json_request(request)
        if error:
            return error
        
        # Get login info
        email = data.get("email", "").strip()   # Use strip in case there was leading or trailing whitespace
        password = data.get("password", "")

        # Check for missing field
        if not email or not password:
            return JsonResponse(
                {"error": "Email and password are both required."},
                status=400  # Missing one of the fields
            )
        
        # Check if the user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse(
                {"error": "Invalid email or password"},     # Standard to not specify which one is invalid for security reasons
                status=401  # invalid credentials
            )
        
        # Check entered password against actual user password
        correct_password = bcrypt.checkpw(
            password.encode("utf-8"),   # Change to bytes so that bcrypt can work with it
            user.password_hash.encode("utf-8"),
        )
        if not correct_password:
            return JsonResponse(
                {"error": "Invalid email or password"},
                status=401
            )
        
        # Metadata about the token
        payload = {
            "sub": str(user.id),
            "email": user.email
        }
        token = 


        





########################################################################################################################################################################################

#User views 
@method_decorator(csrf_exempt, name='dispatch')
class UserCreateView(View):
    """ 
    This creates a new user account 

    It will call the UserFactory and the factory will handle the creation.

    This is the POST /api/users/ 
    """
    def post(self, request):
        #Handle post request to create a new user
        data, error = parse_json_request(request)
        if error:
            return error
        
        try:
            user = UserFactory.create_user(
                role=data.get("role", "OPERATOR"),
                email=data["email"],
                password=data["password"],
            )

            logger.info(f"User created: {user.email} with role {user.role}")

            #Return user info as JSON 
            return JsonResponse(
                {
                    "id": str(user.id),
                    "email": user.email,
                    "role": user.role,
                    "permissions": user.get_permissions(),
                    "created_at": user.created_at.isoformat(),
                },
                status=201, #This status code means "Created"
            )
        
        except KeyError as e:
            #This is a missing required field 
            #400 again means bad request 
            return JsonResponse(
                {"error": f"Missing required field: {str(e)}"},
                status=400
            )
        
        except ValueError as e:
            #For invalid role 
            return JsonResponse(
                {"error": str(e)},
                status=400,
            )
        
        except Exception as e:
            #Check fro duplicate account (email)
            if "Duplicate entry" in str(e) or "UNIQUE constraint" in str(e):
                return JsonResponse(
                    {"error": "A user with that email already exists"},
                    status=400,
                )
            logger.error("Error creating user: %s", str(e))
            return JsonResponse(
                {"error": "An error occurred while creating the user"},
                status=500, #this status code means "Internal Server Error" kind of a catch all for other errors that we didn't anticipate
            )

########################################################################################################################################################################################

#Spray record views
@method_decorator(csrf_exempt, name='dispatch')
class RecordListCreateView(View):
    """ 
    This handles the: 
    POST /api/records/              - Create a new record
    GET /api/records/               - List records (with filtering)

    ALso will handle filtering here are the parameters for that:
        ?status=DRAFT                      Filter by workflow status
        ?operator_email=op@example.com    Filter by operator
        ?date_from=2021-01-01               Records on or after this date
        ?date_to=2026-12-31                Records on or before this date
        ?product_name=Roundup             Search by chemical name
        ?pcp_act_number=PCP-12345          Filter by PCP Act number
        ?search=keyword                   Search across all text fields
    """
    def get(self, request):
        """
        List all spray records with the optional filters 

        THe admin can use this to search and filter historical records.
        """
        #Start with all records, have the newest ones first
        records = SprayRecord.objects.all().order_by("-created_at")

        #Then the filters 
        #THe filters only work if the query is present in the URL
        #Front end needs to add these to the URL when making the request if they want to filter

        #Filter by workflow status
        status = request.GET.get("status")
        if status:
            records = records.filter(status=status)
        
        #Filter by who created a record 
        operator = request.GET.get("operator_email")
        if operator:
            records = records.filter(operator__email=operator)
        
        #filter by a date range 
        #__gte means "greater than or equal to" and __lte means "less than or equal to" if needed both, thanks geeks for geeks! 
        date_from = request.GET.get("date_from")
        if date_from:
            records = records.filter(date_applied__gte=date_from)
        
        date_to = request.GET.get("date_to")
        if date_to:
            records = records.filter(date_applied__lte=date_to)
        
        #Filter by produt or chemical name
        product_name = request.GET.get("product_name")
        if product_name:
            records = records.filter(product_name__icontains=product_name) #I think i implemented this right, this should return partial matches and be case insensitive... hopefully 
        
        #Filter by pcp act number
        pcp_act_number = request.GET.get("pcp_act_number")
        if pcp_act_number:
            records = records.filter(pcp_act_number=pcp_act_number)
        
        #Gonna try to add a general keyword search across everything
        search = request.GET.get("search")
        if search:
            from django.db.models import Q #This lets us do more complex queries with OR and AND and stuff
            records = records.filter(
                Q(product_name__icontains=search) |
                Q(location_text__icontains=search) |
                Q(notes__icontains=search) |
                Q(pcp_act_number__icontains=search) |
                Q(operator__email__icontains=search)
            )
        
        #Now we gotta change everythign to the JSON format
        data = [] 
        for record in records: 
            data.append(serialize_record(record))
        
        return JsonResponse(
            {"records": data,
            "count": len(data),
            },
            status=200, #THis status code means good request 
        )
    
    def post(self, request):
        """
        This will create a new spray record using the SprayRecordFactory
        """
        #parse the JSON
        data, error = parse_json_request(request)
        if error:
            return error 
        
        try: 
            #Use the factory to create the record 
            record = SprayRecordFactory.create_record(data)
            logger.info("Record created: %s", record.id)

            return JsonResponse(serialize_record(record), status=201) #201 means created 
        
        #Error handling
        except KeyError as e:
            #missing field in the input data
            return JsonResponse(
                {"error": f"Missing required field: {str(e)}"},
                status=400,
            )
        except ValueError as e:
            #something wrong with the input data (like invalid date format or something)
            return JsonResponse(
                {"error": str(e)},
                status=400,
            )
        except Exception as e:
            logger.error("Error creating record: %s", str(e))
            return JsonResponse(
                {"error": "An error occurred while creating the record"},
                status=500,
            )

########################################################################################################################################################################################

#Now the Detail and update view for a single record
@method_decorator(csrf_exempt, name='dispatch')
class RecordDetailView(View):
    """ 
    GET /api/records/<id>/          - Retrieve a specific record (a single one)
    PUT /api/records/<id>/          - Update a specific record (a draft one)
    """
    def get(self, request, record_id):
        """
        Retrieve a specific record by ID 
        """
        try:
            record = SprayRecord.objects.get(id=record_id)
            return JsonResponse(serialize_record(record), status=200)
        except SprayRecord.DoesNotExist:
            return JsonResponse(
                {"error": "Record not found"},
                status=404, #This status code means "Not Found"
            )
    
    def put(self, request, record_id):
        """ 
        update a spray record with editable fields 

        important that only drafts can be changed 

        also need to notify observers when updated 
        """
        #parse the JSON
        data, error = parse_json_request(request)
        if error:
            return error

        #Then look up the record
        try:
            record = SprayRecord.objects.get(id=record_id)
        except SprayRecord.DoesNotExist:
            return JsonResponse(
                {"error": "Record not found"},
                status=404,
            )
        
        #make sure that only drafts are editable 
        if record.status != RecordStatus.DRAFT:
            return JsonResponse(
                {"error": "Only draft records can be edited"},
                status=400,
            )
        
        #THen can update 
        #only change fields that were in the request 
        editable_fields = [
            "product_name", "pcp_act_number", "chemical_volume_l", "water_volume_l", 
            "notes", "location_text", "date_applied",
        ]
        
        for field in editable_fields:
            if field in data:
                setattr(record, field, data[field]) # this sets the attribute of the record to the new value from the data
        
        #if the polygon was altered then it nneds extra updating 
        if "geometry_polygon" in data:
            polygon = data["geometry_polygon"]
            if polygon:
                #need to make sure its valid again and recenter... 
                SprayRecordFactory.validate_polygon(polygon)
                center_lat, center_lng = SprayRecordFactory.calculate_polygon_center(polygon)
                record.geometry_polygon = polygon
                record.geometry_center_lat = center_lat
                record.geometry_center_lng = center_lng
            
            else:
                #let them get rid of the polygon, can do this by setting to none 
                record.geometry_polygon = None
                record.geometry_center_lat = None
                record.geometry_center_lng = None
        
        #Gotta save it now 
        record.save()

        #Then fire the observer events 
        spray_record_subject.set_state({
            "event": "record_updated",
            "record_id": str(record.id),
            "actor_email" : data.get("actor_email", record.operator_email),
        })

########################################################################################################################################################################################

#Workflow view 
#This handles the draft to submitted to approved or flaged flow
#will use a helper function at the bottom called transition_status() to validate and update observers 
@method_decorator(csrf_exempt, name='dispatch')
class RecordSubmitView(View):
    """
    POST /api/records/<id>/submit/ - Submit a specific record (a draft one) for review
    """
    def post(self, request, record_id):
        data, _ = parse_json_request(request) #we dont actually need to parse any data for this one, but we can get the actor email if they sent it for the observer log
        actor_email = data.get("actor_email", "") if data else "unknown"

        return transition_status(
            record_id=record_id,
            actor_email=actor_email,
            expected_from=RecordStatus.DRAFT,
            new_status=RecordStatus.SUBMITTED,
        )

@method_decorator(csrf_exempt, name='dispatch')
class RecordApproveView(View):
    """
    POST /api/records/<id>/approve/ - Approve a specific record (a submitted one)

    Must be an admin reviewing a submitted record 
    """
    def post(self, request, record_id):
        data, _ = parse_json_request(request) #we dont actually need to parse any data for this one, but we can get the actor email if they sent it for the observer log
        actor_email = data.get("actor_email", "") if data else "unknown"

        return transition_status(
            record_id=record_id,
            actor_email=actor_email,
            expected_from=RecordStatus.SUBMITTED,
            new_status=RecordStatus.APPROVED,
        )

@method_decorator(csrf_exempt, name='dispatch')
class RecordFlagView(View):
    """
    POST /api/records/<id>/flag/    - Flag a specific record (a submitted one) for review

    Must be an admin reviewing a submitted record and deciding it needs more work or something is wrong with it 
    """
    def post(self, request, record_id):
        data, _ = parse_json_request(request) #we dont actually need to parse any data for this one, but we can get the actor email if they sent it for the observer log
        actor_email = data.get("actor_email", "") if data else "unknown"

        return transition_status(
            record_id=record_id,
            actor_email=actor_email,
            expected_from=RecordStatus.SUBMITTED,
            new_status=RecordStatus.FLAGGED,
        )

########################################################################################################################################################################################

#Audit log view
@method_decorator(csrf_exempt, name='dispatch')
class RecordAuditLogView(View):
    """
    GET /api/records/<id>/audit-log/ - get the log of everything that happened to a single record 

    This is where we can see the history of a record, who created it, when it was submitted, approved, etc. 
    This will be useful for admins to review the history of a record and for transparency. 
    """
    def get(self, request, record_id):
        #get all audit logs for this record, ordered by most recent first
        logs = AuditLog.objects.filter(record_id=record_id).order_by("-timestamp") 

        #Then gotta convert everything to JSON format 
        data = []
        for log in logs:
            data.append({
                "id": str(log.id),
                "record_id": str(log.record_id),
                "action": log.action,
                "from_status": log.from_status,
                "to_status": log.to_status,
                "timestamp": log.timestamp.isoformat(),
            })
        
        return JsonResponse(
            {"audit_logs": data,
            "count": len(data),
            }, status = 200 
        )#good request

########################################################################################################################################################################################

#Helper functions 
def serialize_record(record):
    """ 
    Helper function to convert a SprayRecord object into a JSON-serializable dictionary 

    This is used in the views to return record data in the API responses. 

    SHould be easy peasy 
    """
    return {
        "id": str(record.id),
        "operator_email": record.operator.email,
        "date_applied": record.date_applied.isoformat(),
        "product_name": record.product_name,
        "pcp_act_number": record.pcp_act_number,
        "chemical_volume_l": record.chemical_volume_l,
        "water_volume_l": record.water_volume_l,
        "notes": record.notes,
        "location_text": record.location_text,
        "geometry_polygon": record.geometry_polygon,
        "geometry_center_lat": (str(record.geometry_center_lat) if record.geometry_center_lat is not None else None),
        "geometry_center_lng": (str(record.geometry_center_lng) if record.geometry_center_lng is not None else None),
        "status": record.status,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }

def transition_status(record_id, actor_email, expected_from, new_status): 
    """ 
    This is the function that needs to handle the transitions of statuses 

    Needs to validate the transition and update, then let the observers know 
    """
    #Find the record
    try:
        record = SprayRecord.objects.get(id=record_id)
    except SprayRecord.DoesNotExist:
        return JsonResponse({"error": "Record not found"}, status=404)

    #Validate the transition
    if record.status != expected_from:
        return JsonResponse({"error": f"Invalid status transition from {record.status} to {new_status}"}, status=400)

    #first should save old status before we change 
    old_status = record.status

    #Now apply transition  
    record.status = new_status
    record.save()

    #Now fire observer events 
    spray_record_subject.set_state({
        "event": "status_changed",
        "record_id": str(record.id),
        "actor_email": actor_email or record.operator.email, #if we have an actor email from the request use that, otherwise use the operator email from the record for the log
        "from_status": old_status,
        "to_status": new_status,
    })

    logger.info(
        "Record %s: %s -> %s (by %s)", 
        record.id, old_status, new_status, actor_email,
    )

    return JsonResponse(serialize_record(record), status=200)