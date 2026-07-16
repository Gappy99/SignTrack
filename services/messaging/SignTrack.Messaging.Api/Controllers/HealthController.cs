using Microsoft.AspNetCore.Mvc;

namespace SignTrack.Messaging.Api.Controllers;

[ApiController]
[Route("api/v1")]
public class HealthController : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health() =>
        Ok(new
        {
            status = "Healthy",
            service = "SignTrack.Messaging.Api",
            timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        });
}
