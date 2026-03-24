"""
This file will register our models with the Django admin site, allowing us to manage our data through the admin interface.

From the website im pretty sure we can access this panel by 
 -run python manage.py createsuperuser to create an admin user
 -start the server with python manage.py runserver
 -go to http://127.0.0.1:8000/admin/ in your web browser
 """

from django.contrib import admin
from records.models import User, SprayRecord, AuditLog

#Register the User model with the admin site 
@admin.register(User)
class UserAdmin(admin.ModelAdmin): 
    #The columns shown in the list view of the admin site 
    list_display = ("email", "role", "created_at")

    #Sidebar filters for the list view
    list_filter = ("role",)

    #Search bar 
    search_fields = ("email",)

#Now the same for the SprayRecord model
@admin.register(SprayRecord)
class SprayRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "operator_email", "product_name", "pcp_act_number", "status", "date_applied", "created_at")
    list_filter = ("status", "date_applied", "product_name")
    search_fields = ("operator_email", "product_name", "pcp_act_number", "location_text")

#now the same for the AuditLog model
@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "record_id", "actor_email", "action", "from_status", "to_status", "timestamp")
    list_filter = ("action",)
    search_fields = ("actor_email",)