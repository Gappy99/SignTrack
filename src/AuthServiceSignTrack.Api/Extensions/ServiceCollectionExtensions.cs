using AuthServiceSignTrack.Application.Interfaces;
using AuthServiceSignTrack.Application.Services;
using AuthServiceSignTrack.Domain.Interfaces;
using AuthServiceSignTrack.Persistence.Data;
using AuthServiceSignTrack.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AuthServiceSignTrack.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"))
                .UseSnakeCaseNamingConvention());
        
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<IPasswordHashService, PasswordHashService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<ICloudinaryService, CloudinaryService>();
        services.AddScoped<IEmailService, EmailService>();

        services.AddHealthChecks();

        return services;
    }

    public static IServiceCollection AddApiDocumentation(this IServiceCollection services, IWebHostEnvironment env)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        
        // Store environment for custom OpenAPI spec loading
        var openApiPath = Path.Combine(env.ContentRootPath, "wwwroot", "openapi.json");
        if (File.Exists(openApiPath))
        {
            services.AddSingleton(new OpenApiSpecPath { Path = openApiPath });
        }

        return services;
    }
}

/// <summary>
/// Clase auxiliar para almacenar la ruta del archivo OpenAPI personalizado
/// </summary>
public class OpenApiSpecPath
{
    public required string Path { get; set; }
}