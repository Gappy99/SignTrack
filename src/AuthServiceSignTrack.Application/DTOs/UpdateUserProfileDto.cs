namespace AuthServiceSignTrack.Application.DTOs;

public class UpdateUserProfileDto
{
    public string? Name { get; set; }
    public string? Surname { get; set; }
    public string? Phone { get; set; }
    // ProfilePicture can be a path/key handled by cloudinary service elsewhere
    public string? ProfilePicture { get; set; }
}
