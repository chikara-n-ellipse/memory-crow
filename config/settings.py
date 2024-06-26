"""
Django settings for config project.

Generated by 'django-admin startproject' using Django 4.1.2.

For more information on this file, see
https://docs.djangoproject.com/en/4.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.1/ref/settings/
"""

from pathlib import Path
import os
import json


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


private = None
with open(os.path.join(BASE_DIR, '.private.json')) as f:
    private = json.load(f)


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.1/howto/deployment/checklist/


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = private["SECRET_KEY"]


# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = private["DEBUG"]
ALLOWED_HOSTS = private["ALLOWED_HOSTS"]


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cms.apps.CmsConfig',   # cms アプリケーション
    'users.apps.UsersConfig',   # users アプリケーション
    # 'bootstrap4',           # django-bootstrap4
    # 'bootstrap5',           # django-bootstrap5
    # 'rest_framework',
    'ninja',
    # 'mdeditor', 
    'social_django',
    'django_select2',
]


# for mdeditor
X_FRAME_OPTIONS = 'SAMEORIGIN'


# mdeditor, ファイルアップロード用
MEDIA_ROOT = os.path.join(BASE_DIR, 'cms', 'uploads') # 反映されなかったため
MEDIA_URL = '/media/'


MDEDITOR_CONFIGS = {
    'default': {
        'language': 'en',
        'theme': 'dark', 
        'upload_image_url': '',
        'preview_theme': 'dark',
        'editor_theme': 'pastel-on-dark',
        'height': 300,
        'lineWrapping': True,
    }
}


MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'social_django.middleware.SocialAuthExceptionMiddleware',
]


ROOT_URLCONF = 'config.urls'


AUTHENTICATION_BACKENDS = [
    'social_core.backends.google.GoogleOAuth2',
    # 'cms.backends.EmailAuthenticationBackend',
    'django.contrib.auth.backends.ModelBackend',

]


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'social_django.context_processors.backends',
                'social_django.context_processors.login_redirect',
            ],
        },
    },
]


# Google OAuth2 認証情報
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = private["SOCIAL_AUTH_GOOGLE_OAUTH2_KEY"]  # クライアントID
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = private["SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET"] # クライアント シークレット


# social django
LOGIN_URL = '/accounts/login'
LOGIN_REDIRECT_URL = '/accounts/user_dashboard'
LOGOUT_URL = '/accounts/logout'
LOGOUT_REDIRECT_URL = '/accounts/login'


SOCIAL_AUTH_PIPELINE = (
  "social_core.pipeline.social_auth.social_details",
  "social_core.pipeline.social_auth.social_uid",
  "social_core.pipeline.social_auth.social_user",
  
  "users.auth_pipeline.require_nickname",
  "users.auth_pipeline.set_user_data",  # 追加


  "social_core.pipeline.user.get_username", # 新規ユーザはあとで作るのでコメントアウト
  "social_core.pipeline.social_auth.associate_by_email",
  "social_core.pipeline.user.create_user", # 新規ユーザはあとで作るのでコメントアウト
  "social_core.pipeline.social_auth.associate_user",
  "social_core.pipeline.social_auth.load_extra_data",
  "social_core.pipeline.user.user_details",
)


WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.1/ref/settings/#databases

DATABASES = {
    'default': {
        # 'ENGINE': 'django.db.backends.sqlite3',
        # 'NAME': str(os.path.join(BASE_DIR, "db.sqlite3")),

        'ENGINE': 'django.db.backends.postgresql_psycopg2', # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': private["db_name"], #str(os.path.join(BASE_DIR, "db.sqlite3")),                      # Or path to database file if using sqlite3.
        # The following settings are not used with sqlite3:
        'USER': private["db_username"],
        'PASSWORD': private["db_password"],
        'HOST': 'localhost',                      # Empty for localhost through domain sockets or '127.0.0.1' for localhost through TCP.
        'PORT': '5432',                      # Set to empty string for default.
    }
}


AUTH_USER_MODEL = 'users.CustomUser'


# Password validation
# https://docs.djangoproject.com/en/4.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.1/topics/i18n/

# LANGUAGE_CODE = 'en-us'
LANGUAGE_CODE = 'ja'

# TIME_ZONE = 'UTC'
TIME_ZONE = 'Asia/Tokyo'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.1/howto/static-files/

STATIC_URL = '/static/'

if "SET_STATIC_ROOT" in private:
    STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# Default primary key field type
# https://docs.djangoproject.com/en/4.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LOGGING = private["LOGGING"]