-- VIEW dbo.test_v (modified 2020-12-11T12:41:32.907)



create view [dbo].[test_v] as
select UserID as UserID, row_number() over (order by FightPower desc) as Repute from Sys_Users_Detail




GO
