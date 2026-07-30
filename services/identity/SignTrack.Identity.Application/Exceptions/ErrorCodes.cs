namespace SignTrack.Identity.Application.Exceptions;

public static class ErrorCodes
{
    public const string EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS";
    public const string USERNAME_ALREADY_EXISTS = "USERNAME_ALREADY_EXISTS";
    public const string INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
    public const string USER_ACCOUNT_DISABLED = "USER_ACCOUNT_DISABLED";
    public const string IMAGE_UPLOAD_FAILED = "IMAGE_UPLOAD_FAILED";
    public const string INVALID_FILE_FORMAT = "INVALID_FILE_FORMAT";
    public const string FILE_TOO_LARGE = "FILE_TOO_LARGE";
    public const string MEMBER_ALREADY_EXISTS = "MEMBER_ALREADY_EXISTS";
    public const string REQUEST_ALREADY_PENDING = "REQUEST_ALREADY_PENDING";
    public const string REQUEST_ALREADY_RESPONDED = "REQUEST_ALREADY_RESPONDED";
    public const string INVALID_REQUEST = "INVALID_REQUEST";
}