from uuid import UUID
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictInt,
    StrictStr,
    field_validator,
)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class StartDemo(Strict):
    timezone: StrictStr = Field(min_length=1, max_length=64)


class ResetDemo(Strict):
    confirm: StrictBool


class MomentWrite(Strict):
    mood: StrictInt = Field(ge=1, le=5)
    influences: list[StrictInt] = Field(default_factory=list, max_length=9)
    title: StrictStr = Field(default="", max_length=50)
    body: StrictStr = Field(default="", max_length=2000)
    operationId: StrictStr

    @field_validator("operationId")
    @classmethod
    def operation_uuid(cls, value):
        if str(UUID(value)) != value.lower():
            raise ValueError("Use a canonical UUID for the operation")
        return value.lower()

    @field_validator("influences")
    @classmethod
    def unique_influences(cls, value):
        if len(value) != len(set(value)) or any(item < 1 or item > 9 for item in value):
            raise ValueError(
                "Choose each influence at most once, using IDs 1 through 9"
            )
        return sorted(value)


class MomentUpdate(MomentWrite):
    expectedVersion: StrictInt = Field(ge=1)
