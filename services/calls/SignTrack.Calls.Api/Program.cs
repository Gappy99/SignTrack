using Microsoft.EntityFrameworkCore;
using SignTrack.Calls.Api.Configuration;
using SignTrack.Calls.Api.Data;
using SignTrack.Calls.Api.Extensions;
using SignTrack.Calls.Api.Hubs;
using SignTrack.Calls.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<CallsDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
        .UseSnakeCaseNamingConvention());

builder.Services.Configure<LiveKitSettings>(builder.Configuration.GetSection("LiveKit"));
builder.Services.AddSingleton<ICallHubNotifier, CallHubNotifier>();
builder.Services.AddSingleton<LiveKitTokenService>();
builder.Services.AddScoped<RoomService>();
builder.Services.AddJwtAuthentication(builder.Configuration);

var redisConnection = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConnection, options =>
    {
        options.Configuration.ChannelPrefix = StackExchange.Redis.RedisChannel.Literal("SignTrack:Calls:");
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
app.MapHub<CallHub>("/hubs/calls");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CallsDbContext>();
    await db.Database.MigrateAsync();
}

app.MapGet("/", () => Results.Ok(new
{
    service = "SignTrack.Calls.Api",
    version = "0.3.0",
    status = "ready",
    hubs = new[] { "/hubs/calls" }
}));

app.Run();
