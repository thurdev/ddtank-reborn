-- SQL_STORED_PROCEDURE dbo.SP_Users_PasswordInfo (modified 2021-06-04T05:18:36.273)


-- =============================================
-- Author:<Jacken>
-- ALTER  date: <2010-1-13>
-- Description:	<获取二级密码信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_PasswordInfo]   
@UserID INT
AS  
BEGIN 

  Select *  From Sys_Users_Password Where UserID=@UserID
  
END








GO
