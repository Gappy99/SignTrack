namespace SignTrack.Gateway.Api.Extensions;

public static class CorsExtensions
{
    private static readonly string[] DefaultOrigins =
    [
        "http://localhost:5180",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5050"
    ];

    public static string[] ResolveCorsOrigins(IConfiguration configuration)
    {
        var fromArray = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (fromArray is { Length: > 0 })
        {
            return fromArray;
        }

        var csv = configuration["CORS_ORIGINS"];
        if (!string.IsNullOrWhiteSpace(csv))
        {
            return csv
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }

        return DefaultOrigins;
    }

    public static IServiceCollection AddGatewayCors(this IServiceCollection services, IConfiguration configuration)
    {
        var origins = ResolveCorsOrigins(configuration);

        services.AddCors(options =>
        {
            options.AddPolicy("FrontendCors", policy =>
                policy.WithOrigins(origins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials());
        });

        return services;
    }
}
