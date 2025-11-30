using BinMaps.Core.Contracts;
using BinMaps.Data;
using BinMaps.Data.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BinMaps.Core.Services
{
    public class AdminService : IAreaAdminService
    {
        private readonly IRepository<Area, int> _areaRepo;
        private readonly IRepository<Truck, string> _truckRepo;

        public AdminService(IRepository<Area, int> areaRepo,
                                IRepository<Truck, string> truckRepo)
        {
            _areaRepo = areaRepo;
            _truckRepo = truckRepo;
        }

        public async Task<IEnumerable<Area>> GetAllAreasAsync()
        {
            return await _areaRepo.GetAllAttached()
                .Include(a => a.Bins)
                .Include(a => a.Truck)
                .ToArrayAsync();
        }

        public async Task<bool> AssignTruckAsync(int areaId, string driverId)
        {
            var area = await _areaRepo.GetByIdAsync(areaId);
            if (area == null) return false;

            var truck = await _truckRepo.GetAllAttached()
                .FirstOrDefaultAsync(t => t.DriverId == driverId);

            if (truck == null) return false;

            area.Truck = truck;
            return await _areaRepo.UpdateAsync(area);
        }

        public async Task<bool> MarkAreaAsCleanedAsync(int areaId)
        {
            var area = await _areaRepo.GetByIdAsync(areaId);
            if (area == null) return false;

            area.IsFull = false; 
            return await _areaRepo.UpdateAsync(area);
        }

        public Task<IEnumerable<IdentityUser>> GetAllDriversAsync()
        => _truckRepo.GetAllAttached()
            .Select(t => t.Driver)
            .Distinct()
            .ToArrayAsync()
            .ContinueWith(t => (IEnumerable<IdentityUser>)t.Result);
    }
}
