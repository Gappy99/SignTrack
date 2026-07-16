using System.Security.Cryptography;
using System.Text;

namespace SignTrack.Messaging.Api;

public static class IdGenerator
{
    private static readonly string Alphabet = "123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

    public static string ConversationId() => $"conv_{ShortId()}";
    public static string ParticipantId() => $"prt_{ShortId()}";
    public static string MessageId() => $"msg_{ShortId()}";

    private static string ShortId()
    {
        var bytes = RandomNumberGenerator.GetBytes(12);
        var sb = new StringBuilder(12);
        foreach (var b in bytes)
            sb.Append(Alphabet[b % Alphabet.Length]);
        return sb.ToString();
    }
}
