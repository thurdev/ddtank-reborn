-- SQL_STORED_PROCEDURE dbo.SP_Users_Items_Equip_By_Nick (modified 2021-06-04T05:18:36.170)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：读取当前用户装备类>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Items_Equip_By_Nick]
 @NickName Nvarchar(200)
 AS  
 declare @UserID int
 --declare @count int
 --select @count= isnull(count(*),0) from Sys_Users_Detail where NickName = @Nick
 select @UserID= UserID from Sys_Users_Detail where NickName = @NickName
 --Select @NickName=NickName from  Sys_Users_Detail where UserID = @UserID
   begin 
     select top 31 * from Sys_Users_Goods  
where UserID = @UserID and IsExist = 1 and place>=0 and Place<=30 and BagType=0
   end








GO
