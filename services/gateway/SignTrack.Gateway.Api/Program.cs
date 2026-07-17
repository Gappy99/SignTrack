var builder = WebApplication.CreateBuilder(args);
var downstream = builder.Configuration.GetSection("DownstreamUrls");
var identity = downstream["Identity"] ?? "http://localhost:5104";
var calls = downstream["Calls"] ?? "http://localhost:5200";
var messaging = downstream["Messaging"] ?? "http://localhost:5300";
var recognition = downstream["Recognition"] ?? "http://localhost:3000";

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors", policy =>
        policy.WithOrigins("http://localhost:5180", "http://localhost:5173", "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

builder.Services.AddReverseProxy()
    .LoadFromMemory(
    [
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "identity-auth",
            ClusterId = "identity",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/auth/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "identity-users",
            ClusterId = "identity",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/users/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "identity-groups",
            ClusterId = "identity",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/groups/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "identity-requests",
            ClusterId = "identity",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/requests/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "identity-tasks",
            ClusterId = "identity",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/tasks/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "identity-appointments",
            ClusterId = "identity",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/appointments/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "identity-health",
            ClusterId = "identity",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/health" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "calls-rooms",
            ClusterId = "calls",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/rooms/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "calls-hub",
            ClusterId = "calls",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/hubs/calls/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "calls-hub-root",
            ClusterId = "calls",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/hubs/calls" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "messaging-hub",
            ClusterId = "messaging",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/hubs/chat/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "messaging-hub-root",
            ClusterId = "messaging",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/hubs/chat" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "messaging-notifications",
            ClusterId = "messaging",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/notifications/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "messaging-conversations",
            ClusterId = "messaging",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/conversations/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "messaging-presence",
            ClusterId = "messaging",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/api/v1/presence/{**catch-all}" }
        },
        new Yarp.ReverseProxy.Configuration.RouteConfig
        {
            RouteId = "recognition-api",
            ClusterId = "recognition",
            Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/recognition-api/{**catch-all}" },
            Transforms =
            [
                new Dictionary<string, string> { ["PathRemovePrefix"] = "/recognition-api" }
            ]
        }
    ],
    [
        new Yarp.ReverseProxy.Configuration.ClusterConfig
        {
            ClusterId = "identity",
            Destinations = new Dictionary<string, Yarp.ReverseProxy.Configuration.DestinationConfig>
            {
                ["d1"] = new() { Address = identity }
            }
        },
        new Yarp.ReverseProxy.Configuration.ClusterConfig
        {
            ClusterId = "calls",
            Destinations = new Dictionary<string, Yarp.ReverseProxy.Configuration.DestinationConfig>
            {
                ["d1"] = new() { Address = calls }
            }
        },
        new Yarp.ReverseProxy.Configuration.ClusterConfig
        {
            ClusterId = "messaging",
            Destinations = new Dictionary<string, Yarp.ReverseProxy.Configuration.DestinationConfig>
            {
                ["d1"] = new() { Address = messaging }
            }
        },
        new Yarp.ReverseProxy.Configuration.ClusterConfig
        {
            ClusterId = "recognition",
            Destinations = new Dictionary<string, Yarp.ReverseProxy.Configuration.DestinationConfig>
            {
                ["d1"] = new() { Address = recognition }
            }
        }
    ]);

var app = builder.Build();
app.UseCors("FrontendCors");
app.MapReverseProxy();

app.MapGet("/api/v1/services", () =>
{
    return Results.Ok(new
    {
        services = new[]
        {
            new { name = "Identity", healthUrl = $"{identity}/api/v1/health" },
            new { name = "Calls", healthUrl = $"{calls}/api/v1/health" },
            new { name = "Messaging", healthUrl = $"{messaging}/api/v1/health" },
            new { name = "Recognition", healthUrl = $"{recognition}/health" }
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
    version = "0.2.0",
    status = "ready"
}));

app.Run();
