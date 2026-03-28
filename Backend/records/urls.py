"""
This file is for routing URLs to the appropriate views in the records app.

This tells django which view to call when a user visits a specific URL 

THis is in a separate file to show more decoupling 
"""
from django.urls import path
from records.views import (
    AuthSeedView,
    AuthLoginView,
    UserCreateView,
    RecordListCreateView,
    RecordDetailView,
    RecordSubmitView,
    RecordApproveView,
    RecordFlagView,
    RecordAuditLogView,
    RecordExportView,
)

urlpatterns = [
    path("auth/seed/", AuthSeedView.as_view(), name='auth-seed'),
    path("auth/login/", AuthLoginView.as_view(), name='auth-login'),
    path('users/', UserCreateView.as_view(), name='user-create'),
    path('records/', RecordListCreateView.as_view(), name='record-list-create'),
    path('records/export/', RecordExportView.as_view(), name='record-export'),
    path("records/<uuid:record_id>/", RecordDetailView.as_view(), name="record-detail"),
    path("records/<uuid:record_id>/submit/", RecordSubmitView.as_view(), name="record-submit"),
    path("records/<uuid:record_id>/approve/", RecordApproveView.as_view(), name="record-approve"),
    path("records/<uuid:record_id>/flag/", RecordFlagView.as_view(), name="record-flag"),
    path("records/<uuid:record_id>/audit-log/", RecordAuditLogView.as_view(), name="record-audit-log"),
]