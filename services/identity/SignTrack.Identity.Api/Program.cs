
using SignTrack.Identity.Persistence.Data;
using SignTrack.Identity.Api.Middlewares;
using SignTrack.Identity.Api.Extensions;
using SignTrack.Identity.Api.ModelBinders;
using SignTrack.Identity.Api.Services;
using SignTrack.Identity.Application.Interfaces;
using SignTrack.Identity.Application.Services;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

var builder = WebApplication.CreateBuilder(args);

var jwtSecret = builder.Configuration["JwtSettings:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Contains("CHANGE_ME", StringComparison.Ordinal))
{
    if (builder.Environment.IsProduction())
    {
        throw new InvalidOperationException(
            "JwtSettings:SecretKey must be configured via User Secrets or environment variables.");
    }

    Console.WriteLine(
        "WARNING: JwtSettings:SecretKey uses a placeholder. Run: dotnet user-secrets set \"JwtSettings:SecretKey\" \"<min-32-chars>\"");
}

builder.Host.UseSerilog((context, services, loggerConfiguration) =>
    loggerConfiguration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services));

builder.Services.AddControllers(options =>
{
    options.ModelBinderProviders.Insert(0, new FileDataModelBinderProvider());
})
.AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddHttpContextAccessor();
var messagingUrl = builder.Configuration["DownstreamUrls:Messaging"] ?? "http://localhost:5300";
var callsUrl = builder.Configuration["DownstreamUrls:Calls"] ?? "http://localhost:5200";
builder.Services.AddHttpClient("Messaging", client => client.BaseAddress = new Uri(messagingUrl));
builder.Services.AddHttpClient("Calls", client => client.BaseAddress = new Uri(callsUrl));
builder.Services.AddScoped<IPushNotifier, MessagingPushNotifier>();
builder.Services.AddScoped<ICallsRoomClient, CallsRoomClient>();
builder.Services.AddApiDocumentation();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddRateLimitingPolicies();
builder.Services.AddSecurityPolicies(builder.Configuration, builder.Environment);

// Services for sign language resources (e.g., declarative mappings for video/image URLs).
builder.Services.AddSingleton<ISignLanguageService, SignLanguageService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Add Serilog request logging
app.UseSerilogRequestLogging();

// Serve static assets (e.g. sign language video/image resources)
app.UseStaticFiles();

// Add Security Headers using NetEscapades package
app.UseSecurityHeaders(policies => policies
    .AddDefaultSecurityHeaders()
    .RemoveServerHeader()
    .AddFrameOptionsDeny()
    .AddXssProtectionBlock()
    .AddContentTypeOptionsNoSniff()
    .AddReferrerPolicyStrictOriginWhenCrossOrigin()
    .AddContentSecurityPolicy(builder =>
    {
        builder.AddDefaultSrc().Self();
        builder.AddScriptSrc().Self().UnsafeInline();
        builder.AddStyleSrc().Self().UnsafeInline();
        builder.AddImgSrc().Self().Data();
        builder.AddFontSrc().Self().Data();
        builder.AddConnectSrc().Self();
        builder.AddFrameAncestors().None();
        builder.AddBaseUri().Self();
        builder.AddFormAction().Self();
    })
    .AddCustomHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    .AddCustomHeader("Cache-Control", "no-store, no-cache, must-revalidate, private")
);

// Global exception handling
app.UseMiddleware<GlobalExceptionMiddleware>();

// Core middlewares
app.UseHttpsRedirection();
app.UseCors("DefaultCorsPolicy");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Canonical health: GET /api/v1/health (HealthController)
var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();
app.Lifetime.ApplicationStarted.Register(() =>
{
    try
    {
        var server = app.Services.GetRequiredService<IServer>();
        var addressesFeature = server.Features.Get<IServerAddressesFeature>();
        var addresses = (IEnumerable<string>?)addressesFeature?.Addresses ?? app.Urls;

        if (addresses != null && addresses.Any())
        {
            foreach (var addr in addresses)
            {
                var health = $"{addr.TrimEnd('/')}/api/v1/health";
                startupLogger.LogInformation("SignTrack.Identity running at {Url}. Health: {HealthUrl}", addr, health);
            }
        }
        else
        {
            startupLogger.LogInformation("SignTrack.Identity started. Health: /api/v1/health");
        }
    }
    catch (Exception ex)
    {
        startupLogger.LogWarning(ex, "Failed to determine the listening addresses for startup log");
    }
});

// Initialize database and seed data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        logger.LogInformation("Applying EF Core migrations...");

        await context.Database.MigrateAsync();

        logger.LogInformation("Database ready. Running seed data...");
        await DataSeeder.SeedAsync(context);

        logger.LogInformation("Database initialization completed successfully");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while initializing the database");
        throw; // Re-throw to stop the application
    }
}

app.Run();

