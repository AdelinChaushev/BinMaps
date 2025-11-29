using BinMaps.Core.Contracts;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Core.Services
{
    public class AuthService : IAuthService
    {


        private readonly UserManager<IdentityUser> userManager;
        private readonly IConfiguration configuration;

        public AuthService(IConfiguration configuration, UserManager<IdentityUser> userManager)
        {

            this.configuration = configuration;
            this.userManager = userManager;


        }

        public async Task<IdentityUser> Authenticate(string email, string password)
        {

            var user = await userManager.FindByEmailAsync(email);



            if (user != null && await this.userManager.CheckPasswordAsync(user, password))
            {

                return user;
            }

            return null;
        }

        public string GenerateJSONWebToken(IdentityUser user)
        {
            var authClaims = new List<Claim>
            {

                new (ClaimTypes.NameIdentifier,user.Id),
                new (ClaimTypes.Name, user.UserName),
                new (JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };
            string jwtSecret = this.configuration["JWT:Secret"];
            byte[] jwtSecretBytes = Encoding.UTF8.GetBytes(jwtSecret);
            var authSigningKey = new SymmetricSecurityKey(jwtSecretBytes);
            var token = new JwtSecurityToken(
                issuer: this.configuration["JWT:ValidIssuer"],
                audience: this.configuration["JWT:ValidAudience"],
                expires: DateTime.Now.AddHours(3),
                claims: authClaims,
                signingCredentials:
                new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256));
            string issuedToken = new JwtSecurityTokenHandler().WriteToken(token);
            return issuedToken;


        }

        public async Task<IdentityUser> CreateUser(string userName, string email, string password)
        {

            IdentityUser user = new IdentityUser()
            {
                UserName = userName,
                Email = email,
                EmailConfirmed = true
            };
            var userExist = await userManager.FindByEmailAsync(email);
            if (userExist != null)
            {
                throw new ArgumentException("User with this password already exists");
            }

            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded)
            {
                return null;
            }

            return user;
        }

        public async Task<IEnumerable<string>> GetRolesUsers(string id)
        =>
           await userManager.GetRolesAsync(await userManager.FindByIdAsync(id));

        public async Task RemoveUserFromRole(string userId, string role)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (!await userManager.IsInRoleAsync(user, role))
            {
                return;
            }

            await userManager.RemoveFromRoleAsync(user, role);
        }

        public async Task AddUserToRole(string userId, string role)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (await userManager.IsInRoleAsync(user, role))
            {
                return;
            }
            await userManager.AddToRoleAsync(user, role);
        }
        public async Task DeactivateAccount(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);

            await userManager.DeleteAsync(user);
        }
    
        public async Task<IdentityUser> GetUserById(string id)
        {
            var user = await userManager.FindByIdAsync(id);
            return user;
		}
	}
}
