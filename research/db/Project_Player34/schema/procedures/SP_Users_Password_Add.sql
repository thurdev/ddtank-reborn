-- SQL_STORED_PROCEDURE dbo.SP_Users_Password_Add (modified 2021-06-04T05:18:36.263)


-- =============================================
-- Author:<XiaoV>
-- ALTER  date: <2010-1-11>
-- Description:	<更新一条服务器配置信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Password_Add]   
@UserID INT,
@PasswordQuestion1 Nvarchar(50),
@PasswordAnswer1 Nvarchar(50),
@PasswordQuestion2 Nvarchar(50),
@PasswordAnswer2 Nvarchar(50),
@FailedPasswordAttemptCount Int
AS  
BEGIN 
  DECLARE @Counts int
  Select @Counts= IsNull(Count(*),0)  From Sys_Users_Password Where UserID=@UserID
  If @Counts=1
     Update Sys_Users_Password Set  PasswordQuestion1=@PasswordQuestion1 , PasswordAnswer1=@PasswordAnswer1,PasswordQuestion2=@PasswordQuestion2 , PasswordAnswer2=@PasswordAnswer2,LastFindDate=Convert(varchar(10),GetDate(),120) ,FailedPasswordAttemptCount=@FailedPasswordAttemptCount   Where  UserId=@UserID
  Else
     Insert Into Sys_Users_Password(UserID,PasswordQuestion1,PasswordAnswer1,PasswordQuestion2,PasswordAnswer2,LastFindDate,FailedPasswordAttemptCount)
            Values(@UserID,@PasswordQuestion1,@PasswordAnswer1,@PasswordQuestion2,@PasswordAnswer2,Convert(varchar(10),GetDate(),120),@FailedPasswordAttemptCount)

END







GO
