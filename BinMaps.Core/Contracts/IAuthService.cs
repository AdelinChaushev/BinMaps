using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Core.Contracts
{
    public interface IAuthService
    {
        Task<IdentityUser> Authenticate(string email, string password);
        string GenerateJSONWebToken(IdentityUser user);
        Task <IdentityUser> GetUserById (string id);
		Task<IdentityUser> CreateUser(string userName, string email, string password);
        Task<IEnumerable<string>> GetRolesUsers(string id);
        Task RemoveUserFromRole(string userId, string role);
        Task AddUserToRole(string userId, string role);
        Task DeactivateAccount(string userId);
    }
}
