from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from django.conf import settings
from jan_zizka.views import robots_txt

urlpatterns = [
    path('zizka/', admin.site.urls),
    path('', include('home.urls')),
    path('auth/', include('authentication.urls')),
    path("robots.txt", robots_txt),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
