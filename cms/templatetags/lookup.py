# coding=utf-8
from django import template
register = template.Library()


@register.filter(name='lookup')
def lookup(value, arg):
    return value.fields.get(arg)