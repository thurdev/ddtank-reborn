-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_UserIdInfo_Sto (modified 2012-04-21T07:53:25.187)

CREATE        PROCEDURE [dbo].[Ddt_Tank_UserIdInfo_Sto]
 @username nvarchar(50),
 @type int  AS
declare @isValues nvarchar(50)
if @type=1
  Begin
SELECT userid,username,nickname,Sex  fROM Db_Tank.Dbo.Sys_Users_Detail with(nolock) where username=@username
 End
if @type=2
  Begin
SELECT userid,username,nickname,Sex  fROM Db_Tank.Dbo.Sys_Users_Detail with(nolock) where nickname=@username
  End
if @type=3
  Begin
SELECT userid,username,nickname,Sex  fROM Db_Tank.Dbo.Sys_Users_Detail with(nolock) where userId=@username
  End
if @type=4
  Begin
select @isValues = nickname fROM Db_Tank.Dbo.Sys_Users_Detail with(nolock) where nickname=@username

if (substring(@username,0,12) = 'GMIsIdSend_')
begin
SELECT userid,username,nickname,Sex  fROM Db_Tank.Dbo.Sys_Users_Detail with(nolock) where userId=substring(@username,12,50)
end
else
begin
SELECT userid,username,nickname,Sex  fROM Db_Tank.Dbo.Sys_Users_Detail with(nolock) where nickname=@username
end
  End

GO
