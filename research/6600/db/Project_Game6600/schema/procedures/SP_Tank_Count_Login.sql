-- SQL_STORED_PROCEDURE dbo.SP_Tank_Count_Login (modified 2015-01-25T14:04:48.163)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<记录数据：导入登陆用户>
-- =============================================
CREATE Procedure [dbo].[SP_Tank_Count_Login]
@AppID int,
@SubID int
as
declare @MaxDate datetime
select @MaxDate=isnull(Max(LoginDateTime),0) from Db_Count..Count_Login

insert into Db_Count..Count_Login(ApplicationId,SubID,ServerName,LoginDateTime,IsSex,OwnAddress,OwnNet,OnSite,UserID,IPAddress,LoginTime)
select @AppID,@SubID,'',LastDate,Sex,'','','',UserID,ActiveIP,1 from Db_Tank..Sys_Users_Detail where LastDate>@MaxDate

GO
