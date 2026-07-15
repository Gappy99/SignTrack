var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();

app.MapGet("/", () => Results.Ok(new
{
    service = "SignTrack.Messaging.Api",
    version = "0.1.0",
    status = "scaffold"
}));

app.Run();
