
from django.contrib.auth import get_user_model
from social_core.pipeline.partial import partial
from django.contrib.auth import get_user_model, authenticate, login, logout

User = get_user_model()


@partial
def require_nickname(strategy, details, user=None, is_new=False, *args, **kwargs):
    if not kwargs.get('ajax') and is_new:
        nickname = strategy.request_data().get('nickname')
        if nickname:
            details['nickname'] = nickname
        else:
            current_partial = kwargs.get('current_partial')
            return strategy.redirect(
                '/accounts/first_nickname?partial_token={0}'.format(current_partial.token)
            )


def set_user_data(backend, strategy, details, response, user=None, is_new=False, *args, **kwargs):
    if is_new:
        if not user:
            user = User()
            user.username = details["username"]
            user.email = details["email"]
            user.nickname = details["nickname"]
            user.create_and_set_new_token()
            print(user)
            print(user.id)
            user.save()



