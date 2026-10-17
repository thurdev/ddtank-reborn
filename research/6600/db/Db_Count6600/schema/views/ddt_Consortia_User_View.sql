-- VIEW dbo.ddt_Consortia_User_View (modified 2012-04-21T07:53:24.700)
CREATE VIEW [dbo].[ddt_Consortia_User_View]
AS
SELECT top 100000 a.userid as id,a.dutyid,b.dutyname,b.level,a.isbanchat,a.isexist,c.username,c.nickname,c.grade
       from Db_Tank.dbo.Consortia_Users  a 
            left outer join Db_Tank.dbo.Consortia_Duty  b
                on(a.consortiaid=b.consortiaid)
            left outer join Db_Tank.dbo.Sys_Users_Detail  c
                on(a.userid=c.userid) 
order by level


GO
