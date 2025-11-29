using BinMaps.Core.Contracts;
using BinMaps.Core.Services;
using BinMaps.Data;
using BinMaps.Data.Entities;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// DB Context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<BinMapsDbContext>(options =>
    options.UseSqlServer(connectionString));

// Identity
builder.Services.AddDefaultIdentity<IdentityUser>(options =>
    options.SignIn.RequireConfirmedAccount = true)
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<BinMapsDbContext>();

// Custom services
builder.Services.AddScoped(typeof(IRepository<,>), typeof(Repository<,>));
builder.Services.AddScoped<ITrashContainerServices, TrashContainerServices>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IAreaAdminService, AdminService>();

builder.Services.AddControllersWithViews();

// Authentication
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/Account/Login"; // ? points to your custom controller
    options.AccessDeniedPath = "/Account/Login"; // optional: redirect if access denied
});

var app = builder.Build();

// Seed admin role & user
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

// Middleware
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

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BinMapsDbContext>();
    await context.Database.MigrateAsync(); // Applies migrations + HasData

    if (!context.TrashContainers.Any())
    {
        var jsonPath = "C:\\Users\\user.DESKTOP-F7BGVFP\\Desktop\\Backup\\BinMaps\\BinMaps.Data\\Seed\\SeedBins.json";
        if (File.Exists(jsonPath))
        {
            var json = await File.ReadAllTextAsync(jsonPath);
            var bins = JsonSerializer.Deserialize<TrashContainer[]>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

app.Run();
