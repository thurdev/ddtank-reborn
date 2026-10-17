-- VIEW dbo.ddt_Activation_view (modified 2011-04-13T00:53:16.640)
create view [dbo].[ddt_Activation_view]
as
select cast(''as nvarchar(50)) as AwardID,cast(0 as bit) as PullDown,cast('1990-01-01' as Datetime) as GetDate,
       cast(0 as int) as UserID,cast(0 as int) as Grade,cast('' as nvarchar(100))as UserName, cast('' as nvarchar(100)) as nickName


GO
