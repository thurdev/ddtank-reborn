-- SQL_STORED_PROCEDURE dbo.SP_UserTexp_Update (modified 2021-06-04T05:18:36.603)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UserTexp_Update]   
	@UserID int ,
	@spdTexpExp int ,
	@attTexpExp int ,
	@defTexpExp int ,
	@hpTexpExp int ,
	@lukTexpExp int ,
	@texpTaskCount int ,
	@texpCount int ,
	@texpTaskDate datetime
AS  
UPDATE [dbo].[Sys_Users_Texp]
   SET [spdTexpExp] = @spdTexpExp
      ,[attTexpExp] = @attTexpExp
      ,[defTexpExp] = @defTexpExp
      ,[hpTexpExp] = @hpTexpExp
      ,[lukTexpExp] = @lukTexpExp
      ,[texpTaskCount] = @texpTaskCount
      ,[texpCount] = @texpCount
      ,[texpTaskDate] = @texpTaskDate
 WHERE UserID = @UserID 








GO
