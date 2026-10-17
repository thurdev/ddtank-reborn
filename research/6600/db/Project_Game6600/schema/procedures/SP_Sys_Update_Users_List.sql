-- SQL_STORED_PROCEDURE dbo.SP_Sys_Update_Users_List (modified 2015-01-25T14:04:48.197)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<更新信息：更新用户排名>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Update_Users_List]
as 

--1、从Copy库中读取用户GP值
  Select GP,UserId * 1 as UserId,SId = identity(int,1,1) into #TempB
         From dbo.Sys_Users_Detail with(nolock)
              Order by GP desc

--2、插入新注册的用户
  INSERT INTO Sys_Users_Order(UserId)
  SELECT  UserId FROM  #TempB
         WHERE  Not EXISTS (SELECT Userid FROM Sys_Users_Order A WHERE #TempB.UserId=A.Userid)
      

--3、更新GP排名信息
  Update Sys_Users_Order with(rowlock)
       Set Repute = #TempB.SId 
       From #TempB 
           Where Sys_Users_Order.UserId=#TempB.UserId
--4、update HonorID
 Update Sys_Users_Order with(rowlock)
       Set honorId = 602
       From #TempB 
           Where Sys_Users_Order.Repute=1
           Update Sys_Users_Order with(rowlock)
       Set honorId = 0
       From #TempB 
           Where Sys_Users_Order.Repute>1
--5、清除临时表
  Drop Table #TempB

GO
