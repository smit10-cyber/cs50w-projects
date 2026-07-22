from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    pass


class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    content = models.TextField()
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created"]

    def __str__(self):
        return f"{self.author} @ {self.created}: {self.content[:20]}"

    def like_count(self):
        return self.likes.count()

    def serialize(self, user=None):
        return {
            "id": self.id,
            "author": self.author.username,
            "content": self.content,
            "created": self.created.strftime("%b %-d %Y, %-I:%M %p"),
            "like_count": self.like_count(),
            "liked": self.likes.filter(user=user).exists() if user and user.is_authenticated else False,
            "is_owner": self.author == user if user else False,
        }


class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="likes")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")

    class Meta:
        unique_together = ("user", "post")


class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name="followers")

    class Meta:
        unique_together = ("follower", "following")

    def __str__(self):
        return f"{self.follower} follows {self.following}"