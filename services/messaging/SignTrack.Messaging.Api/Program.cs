using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using SignTrack.Messaging.Api.Configuration;
using SignTrack.Messaging.Api.Data;
using SignTrack.Messaging.Api.Extensions;
using SignTrack.Messaging.Api.Hubs;
using SignTrack.Messaging.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<MessagingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
        .UseSnakeCaseNamingConvention());

builder.Services.Configure<WebPushSettings>(builder.Configuration.GetSection("WebPush"));
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ConversationService>();
builder.Services.AddSingleton<IChatHubNotifier, ChatHubNotifier>();
builder.Services.AddJwtAuthentication(builder.Configuration);

var redisConnection = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(redisConnection));
builder.Services.AddSingleton<PresenceService>();

builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConnection, options =>
    {
        options.Configuration.ChannelPrefix = StackExchange.Redis.RedisChannel.Literal("SignTrack:Messaging:");
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5180", "http://localhost:5173", "http://localhost:5050")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("DefaultCorsPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MessagingDbContext>();
    await db.EnsureMessagingSchemaAsync();
}

app.MapGet("/", () => Results.Ok(new
{
    service = "SignTrack.Messaging.Api",
    version = "0.4.0",
    status = "ready",
    hubs = new[] { "/hubs/chat" },
    features = new[] { "push", "call-room-chat", "presence" }
}));

app.Run();
