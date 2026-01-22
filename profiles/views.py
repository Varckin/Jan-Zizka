from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404
from django.contrib import messages
from profiles.forms import ProfileEditForm

from user_model.models import User


@login_required
def profile_view(request):
    if request.headers.get('HX-Request'):
        return render(request, "profiles/block_profile.html")
    
    return render(request, "profiles/profile.html")


@login_required
def profile_watch_view(request, username):
    user = get_object_or_404(User, username=username)
    return render(
        request,
        "profiles/profile_view.html",
        {
            "profile_user": user,
        },
    )


@login_required
def profile_edit_view(request):

    if request.method == "POST":
        form = ProfileEditForm(request.POST, request.FILES, instance=request.user)

        if form.is_valid():
            form.save()
            messages.success(request, "Profile updated")

            return render(
                request,
                "profiles/block_profile.html"
            )
    else:
        form = ProfileEditForm(instance=request.user)

    return render(
        request, "profiles/block_profile_edit.html", {"form": form}
    )