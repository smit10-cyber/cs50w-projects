import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render, redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

from .models import User, Post, Like, Follow


def index(request):
    posts = Post.objects.all()
    paginator = Paginator(posts, 10)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)
    return render(request, "network/index.html", {
        "page_obj": page_obj,
    })


def new_post(request):
    if request.method == "POST":
        content = request.POST.get("content", "").strip()
        if content:
            Post.objects.create(author=request.user, content=content)
    return redirect("index")


@csrf_exempt
@login_required
def edit_post(request, post_id):
    try:
        post = Post.objects.get(pk=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found."}, status=404)

    if request.method == "PUT":
        if post.author != request.user:
            return JsonResponse({"error": "You can only edit your own posts."}, status=403)
        data = json.loads(request.body)
        content = data.get("content", "").strip()
        if content:
            post.content = content
            post.save()
        return JsonResponse({"content": post.content}, status=200)

    return JsonResponse({"error": "PUT request required."}, status=400)


@csrf_exempt
@login_required
def like_toggle(request, post_id):
    try:
        post = Post.objects.get(pk=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found."}, status=404)

    if request.method == "PUT":
        existing = Like.objects.filter(user=request.user, post=post)
        if existing.exists():
            existing.delete()
            liked = False
        else:
            Like.objects.create(user=request.user, post=post)
            liked = True
        return JsonResponse({"like_count": post.like_count(), "liked": liked}, status=200)

    return JsonResponse({"error": "PUT request required."}, status=400)


def profile(request, username):
    profile_user = User.objects.get(username=username)
    posts = Post.objects.filter(author=profile_user)
    paginator = Paginator(posts, 10)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)

    followers_count = Follow.objects.filter(following=profile_user).count()
    following_count = Follow.objects.filter(follower=profile_user).count()

    is_following = False
    if request.user.is_authenticated and request.user != profile_user:
        is_following = Follow.objects.filter(follower=request.user, following=profile_user).exists()

    return render(request, "network/profile.html", {
        "profile_user": profile_user,
        "page_obj": page_obj,
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": is_following,
    })


def follow_toggle(request, username):
    if request.method == "POST" and request.user.is_authenticated:
        target = User.objects.get(username=username)
        if target != request.user:
            existing = Follow.objects.filter(follower=request.user, following=target)
            if existing.exists():
                existing.delete()
            else:
                Follow.objects.create(follower=request.user, following=target)
    return redirect("profile", username=username)


@login_required
def following(request):
    followed_users = Follow.objects.filter(follower=request.user).values_list("following", flat=True)
    posts = Post.objects.filter(author__in=followed_users)
    paginator = Paginator(posts, 10)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)
    return render(request, "network/following.html", {
        "page_obj": page_obj,
    })


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")