namespace SignTrack.Calls.Api.Configuration;

public class LiveKitSettings
{
    public string ApiKey { get; set; } = "devkey";
    public string ApiSecret { get; set; } = "secret";
    public string Url { get; set; } = "ws://localhost:7880";
    public int GroupThreshold { get; set; } = 3;
}
