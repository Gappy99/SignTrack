namespace SignTrack.Identity.Domain.Constants;

public static class UserRequestStatuses
{
    public const string Pending = "pending";
    public const string Accepted = "accepted";
    public const string Rejected = "rejected";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Pending,
        Accepted,
        Rejected
    };

    public static readonly IReadOnlySet<string> ResponseStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        Accepted,
        Rejected
    };
}
