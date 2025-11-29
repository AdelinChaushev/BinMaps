using BinMaps.Common.AuthViewModels;
using BinMaps.Core.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BinMaps.Controllers
{
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private IAuthService userService;
        public AuthController(IAuthService userService)
        {
            this.userService = userService;
        }
		[HttpGet("verify")]
        [Authorize(AuthenticationSchemes = "Bearer")]
		public async Task<IActionResult> VerifySession()
		{
			try
			{
				// The JWT token is automatically read from the cookie by ASP.NET Core authentication middleware
				// If we reach this point, the user is authenticated (middleware validated the token)

				// Get the current user's ID from the claims in the JWT
				var userId = GetUserId();
				var token = Request.Cookies["AuthToken"];

				// Fetch user details from database
				var user = await userService.GetUserById(userId);

				// Return user data (without sensitive info like password)
				var userData = new
				{
					id = user.Id,
					name = user.UserName,
					email = user.Email,
					role = await userService.GetRolesUsers(user.Id) // "user", "collector", or "admin"
				};

				return Ok(userData);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}
		[HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                IdentityUser? user = await userService.CreateUser(model.Username, model.Email, model.Password);
               
                string token = userService.GenerateJSONWebToken(user);
                AddCookie(token);
                return Ok(token);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest("Invalid Credentials");
            }
            IdentityUser? user = await userService.Authenticate(model.Email, model.Password);
            if (user == null)
            {
                return BadRequest("Invalid Credentials");
            }
            string token = userService.GenerateJSONWebToken(user);

            AddCookie(token);
            return Ok(token);

        }
        [HttpPost("logout")]
        [Authorize(AuthenticationSchemes = "Bearer")]
        public async Task<IActionResult> Logout()
        {

            Response.Cookies.Delete("token", new CookieOptions
            {
                HttpOnly = true,
                IsEssential = true,
                SameSite = SameSiteMode.None,
                Secure = true, // Set Secure if your cookie is Secure
                Expires = DateTime.Now.AddDays(-1) // Set expiration to a past date
            });
            return Ok();
        }

        [HttpPost("deactivateAccount")]
        [Authorize(AuthenticationSchemes = "Bearer")]
        public async Task<IActionResult> DeactivateAccount()
        {
            await userService.DeactivateAccount(GetUserId());
            return Ok();
        }
        [Authorize(AuthenticationSchemes = "Bearer")]
        [HttpGet("getUserRoles")]
        public async Task<IActionResult> GetUserRoles()
        {
            var roles = await userService.GetRolesUsers(GetUserId());
            return Ok(roles);
        }
        private void AddCookie(string token)
        {
            HttpContext.Response.Cookies.Append("token", token, new CookieOptions()
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                IsEssential = true,
                Expires = DateTime.Now.AddHours(3),
            });
        }
        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }
    }
}
