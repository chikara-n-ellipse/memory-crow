from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible

name_validators = [
    RegexValidator(r"^[^=<>~!\\\*\+\.\?\{\}\(\)\[\]\^\$\|\/]+$", "使用できない文字が含まれています。"),
    RegexValidator(r"^\S", "空白文字で開始できません。"),
    RegexValidator(r"\S$", "空白文字で終了できません。"),
]

lang_validator = RegexValidator(r"^[a-zA-Z\-]{0,31}$", "不正な言語コードです。")

@deconstructible
class DurationRangeValidator():
    def __init__(self, min_delta, max_delta):
        self.min_delta = min_delta
        self.max_delta = max_delta

    def __call__(self, value):
        if value < self.min_delta or value > self.max_delta:
            raise ValidationError(
                f"不正な範囲の値です。要求される範囲{self.min_delta}～{self.min_delta}. 入力値：{value}",
                params={'value': value},
            )
    
    def __eq__(self, other):
        return (
            isinstance(other, RegexValidator)
            and self.min_delta == other.min_delta
            and self.max_delta == other.max_delta
        )
