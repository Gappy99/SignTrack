namespace SignTrack.Identity.Domain.Constants;

public static class TeamGroupMemberRoles
{
    public const string Owner = "owner";
    public const string Member = "member";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Owner,
        Member
    };
}
