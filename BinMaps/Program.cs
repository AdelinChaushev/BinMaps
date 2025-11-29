using BinMaps.Core.Contracts;
using BinMaps.Core.Services;
using BinMaps.Data;
using BinMaps.Data.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<BinMapsDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<BinMapsDbContext>();

builder.Services.AddScoped(typeof(IRepository<,>), typeof(Repository<,>));
builder.Services.AddScoped<ITrashContainerServices, TrashContainerServices>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IAreaAdminService, AdminService>();

builder.Services.AddControllersWithViews();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();

    if (!roleManager.RoleExistsAsync("Admin").GetAwaiter().GetResult())
        roleManager.CreateAsync(new IdentityRole("Admin")).GetAwaiter().GetResult();

    string adminEmail = "admin@binmaps.com";
    string adminPassword = "Admin123!";
    var adminUser = userManager.FindByEmailAsync(adminEmail).GetAwaiter().GetResult();

    if (adminUser == null)
    {
        adminUser = new IdentityUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            EmailConfirmed = true
        };
        var result = userManager.CreateAsync(adminUser, adminPassword).GetAwaiter().GetResult();
        if (result.Succeeded)
            userManager.AddToRoleAsync(adminUser, "Admin").GetAwaiter().GetResult();
    }
}

if (app.Environment.IsDevelopment())
    app.UseDeveloperExceptionPage();
else
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
app.MapRazorPages();

app.Run();
