from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from profiles.forms import ProfileEditForm

from user_model.models import User


@login_required
def profile_view(request):
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
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

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return render(request, "profiles/block_profile.html")
            else:
                return redirect('profile')
    else:
        form = ProfileEditForm(instance=request.user)

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, "profiles/block_profile_edit.html", {"form": form})
    else:
        return redirect('profile')
