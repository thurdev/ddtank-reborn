-- SQL_STORED_PROCEDURE dbo.SP_Sys_Update_OfferList (modified 2021-06-04T05:18:35.803)








-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<更新信息：更新用户的功勋排行>
-- =============================================
CREATE     Procedure [dbo].[SP_Sys_Update_OfferList]
as 
--1、从Copy库中读取用户Offer值
  Select UserId * 1 as UserId,SId = identity(int,1,1) into #TempD
         From dbo.Sys_Users_Detail with(nolock)
              Order by ReputeOffer desc


--2、插入新注册的用户
  INSERT INTO Sys_Users_Order(UserId)
  SELECT  UserId FROM  #TempD
          WHERE  Not EXISTS (SELECT Userid FROM Sys_Users_Order A WHERE #TempD.UserId=A.Userid)


--3、更新Offer值
/*
  Update Sys_Users_Detail with(rowlock) Set ReputeOffer= #TempD.SId 
         From #TempD 
              Where Sys_Users_Detail.UserId=#TempD.UserId
*/
  Update Sys_Users_Order with(rowlock) Set ReputeOffer= #TempD.SId 
         From #TempD 
              Where Sys_Users_Order.UserId=#TempD.UserId


--4、清除临时表
  Drop table #TempD











GO
