namespace SignTrack.Identity.Domain.Constants;

public static class UserRequestTypes
{
    public const string GroupInvite = "group_invite";
    public const string Contact = "contact";
    public const string Meeting = "meeting";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        GroupInvite,
        Contact,
        Meeting
    };
}
