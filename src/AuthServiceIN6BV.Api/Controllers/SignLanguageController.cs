using AuthServiceIN6BV.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AuthServiceIN6BV.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class SignLanguageController : ControllerBase
{
    private readonly ISignLanguageService _signLanguageService;

    public SignLanguageController(ISignLanguageService signLanguageService)
    {
        _signLanguageService = signLanguageService;
    }

    /// <summary>
    /// Get a list of all available sign language resources.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var resources = await _signLanguageService.GetAllResourcesAsync();
        return Ok(new { success = true, data = resources });
    }

    /// <summary>
    /// Get a specific sign language resource by key (e.g. "login", "register").
    /// </summary>
    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key)
    {
        var resource = await _signLanguageService.GetResourceAsync(key);
        if (resource == null)
        {
            return NotFound(new { success = false, message = $"Sign language resource '{key}' not found." });
        }

        return Ok(new { success = true, data = resource });
    }
}
