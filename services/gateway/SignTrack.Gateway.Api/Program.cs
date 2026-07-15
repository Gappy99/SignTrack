var builder = WebApplication.CreateBuilder(args);
var downstream = builder.Configuration.GetSection("DownstreamUrls");

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors", policy =>
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var app = builder.Build();

app.UseCors("FrontendCors");

// Reverse-proxy route map (YARP / Ocelot — Sprint 2):
// | Gateway path                    | Downstream service | Target base URL                              |
// |---------------------------------|--------------------|----------------------------------------------|
// | /api/v1/auth/**                 | Identity           | {DownstreamUrls:Identity}/api/v1/auth/**     |
// | /api/v1/users/**                | Identity           | {DownstreamUrls:Identity}/api/v1/users/**    |
// | /api/v1/rooms                   | Calls              | {DownstreamUrls:Calls}/api/v1/rooms          |
// | /api/v1/rooms/{id}              | Calls              | {DownstreamUrls:Calls}/api/v1/rooms/{id}     |
// | /api/v1/rooms/{id}/join         | Calls              | {DownstreamUrls:Calls}/api/v1/rooms/{id}/join|
// | /api/v1/rooms/{id}/messages/**  | Messaging          | {DownstreamUrls:Messaging}/api/v1/rooms/{id}/messages/** |
// | /api/v1/predict-letter          | Recognition        | {DownstreamUrls:Recognition}/predict-letter    |
// | /api/v1/predict-word            | Recognition        | {DownstreamUrls:Recognition}/predict-word    |

app.MapGet("/api/v1/services", () =>
{
    var identityUrl = downstream["Identity"] ?? "http://localhost:5104";
    var callsUrl = downstream["Calls"] ?? "http://localhost:5200";
    var messagingUrl = downstream["Messaging"] ?? "http://localhost:5300";
    var recognitionUrl = downstream["Recognition"] ?? "http://localhost:3000";

    return Results.Ok(new
    {
        services = new[]
        {
            new { name = "Identity", healthUrl = $"{identityUrl}/api/v1/health" },
            new { name = "Calls", healthUrl = $"{callsUrl}/api/v1/health" },
            new { name = "Messaging", healthUrl = $"{messagingUrl}/api/v1/health" },
            new { name = "Recognition", healthUrl = $"{recognitionUrl}/health" }
        },
        timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    });
});

app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "SignTrack.Gateway",
    timestamp = DateTime.UtcNow
}));

app.MapGet("/", () => Results.Ok(new
{
    service = "SignTrack.Gateway.Api",
    version = "0.1.0",
    status = "scaffold",
    routes = new[]
    {
        "identity -> http://localhost:5104",
        "calls -> http://localhost:5200",
        "messaging -> http://localhost:5300",
        "recognition -> http://localhost:3000"
    }
}));

app.Run();
