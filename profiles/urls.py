from django.urls import path
from profiles.views import profile_watch_view, profile_edit_view, profile_view


urlpatterns = [
    path("", profile_view, name="profile"),
    path("edit/", profile_edit_view, name="profile_edit"),
    path("<str:username>/", profile_watch_view, name="profile_watch"),
]
