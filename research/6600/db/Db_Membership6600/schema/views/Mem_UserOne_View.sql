-- VIEW dbo.Mem_UserOne_View (modified 2009-06-12T19:18:22.790)
CREATE VIEW [dbo].[Mem_UserOne_View]
AS
SELECT     cast('' as varchar(20)) as ApplicationId,
                 cast('' as varchar(50))  as  UserId, 
                 cast('' as varchar(50))  as UserName, 
                cast('' as varchar(50)) As LowerName,
                cast('' as varchar(50)) As MobileAlias,
               cast(0 as bit) as IsAnonymous,
               cast('1999-01-01' as datetime)  as LastActivityDate,
              cast(0 as int )  as LoginTime,
              cast(0 as int) as RoleId, 
                cast('' as varchar(10)) as     RoleName



GO
