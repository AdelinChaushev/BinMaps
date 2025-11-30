using BinMaps.Data.Entities;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Core.Contracts
{
    public interface IAreaAdminService
    {
        Task<IEnumerable<Area>> GetAllAreasAsync();
        Task<bool> AssignTruckAsync(int areaId, string driverId);
        Task<bool> MarkAreaAsCleanedAsync(int areaId);
        Task<IEnumerable<IdentityUser>> GetAllDriversAsync();
    }
}
