from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from authentication.forms import UserRegistrationForm, UserLoginForm


def auth_view(request):
    mode = request.GET.get("mode", "login")

    if request.method == "POST":
        if mode == "register":
            form = UserRegistrationForm(request.POST)
            if form.is_valid():
                user = form.save()
                login(request, user)
                return redirect("home")
        else:
            form = UserLoginForm(request.POST)
            if form.is_valid():
                login(request, form.cleaned_data["user"])
                return redirect("home")
    else:
        form = UserRegistrationForm() if mode == "register" else UserLoginForm()

    return render(
        request, "authentication/authentication.html",
        {
            "form": form,
            "mode": mode,
        },
    )

def logout_view(request):
    logout(request)
    return redirect("home")
