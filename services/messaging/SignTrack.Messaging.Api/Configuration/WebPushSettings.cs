namespace SignTrack.Messaging.Api.Configuration;

public class WebPushSettings
{
    public string Subject { get; set; } = "mailto:admin@SignTrack.com";
    public string PublicKey { get; set; } = "";
    public string PrivateKey { get; set; } = "";
    public bool Enabled => !string.IsNullOrWhiteSpace(PublicKey) && !string.IsNullOrWhiteSpace(PrivateKey);
}
