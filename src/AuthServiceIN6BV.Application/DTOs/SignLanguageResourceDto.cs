namespace AuthServiceIN6BV.Application.DTOs;

public class SignLanguageResourceDto
{
    /// <summary>
    /// The key used to identify the sign language resource (e.g. "login", "register").
    /// </summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// A short description of the meaning of the sign.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// A URL to a video (or other media) that demonstrates the sign.
    /// </summary>
    public string VideoUrl { get; set; } = string.Empty;

    /// <summary>
    /// A URL to an image (e.g. a frame or icon) representing the sign.
    /// </summary>
    public string ImageUrl { get; set; } = string.Empty;
}
